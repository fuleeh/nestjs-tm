import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';

describe('Task Management (e2e)', () => {
  let app: INestApplication;
  let httpServer: any;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    httpServer = app.getHttpServer();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Auth', () => {
    beforeEach(async () => {
      await dataSource.query('DELETE FROM "user";');
    });

    it('POST /auth/signup - creates a user', () => {
      return request(httpServer)
        .post('/auth/signup')
        .send({ username: 'newuser', password: 'StrongPass1!' })
        .expect(201);
    });

    it('POST /auth/signup - rejects duplicate username', async () => {
      await request(httpServer)
        .post('/auth/signup')
        .send({ username: 'dupuser', password: 'StrongPass1!' })
        .expect(201);

      return request(httpServer)
        .post('/auth/signup')
        .send({ username: 'dupuser', password: 'StrongPass1!' })
        .expect(409);
    });

    it('POST /auth/signup - rejects weak password', () => {
      return request(httpServer)
        .post('/auth/signup')
        .send({ username: 'test', password: 'short' })
        .expect(400);
    });

    it('POST /auth/signin - returns a token', async () => {
      await request(httpServer)
        .post('/auth/signup')
        .send({ username: 'signintest', password: 'StrongPass1!' })
        .expect(201);

      const res = await request(httpServer)
        .post('/auth/signin')
        .send({ username: 'signintest', password: 'StrongPass1!' })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
      expect(typeof res.body.accessToken).toBe('string');
    });

    it('POST /auth/signin - rejects wrong password', async () => {
      await request(httpServer)
        .post('/auth/signup')
        .send({ username: 'wrongpw', password: 'StrongPass1!' })
        .expect(201);

      return request(httpServer)
        .post('/auth/signin')
        .send({ username: 'wrongpw', password: 'WrongPass1!' })
        .expect(401);
    });

    it('POST /auth/signin - rejects non-existent user', () => {
      return request(httpServer)
        .post('/auth/signin')
        .send({ username: 'nobody', password: 'SomePass1!' })
        .expect(401);
    });
  });

  describe('Tasks - Authorization', () => {
    beforeEach(async () => {
      await dataSource.query('DELETE FROM task;');
      await dataSource.query('DELETE FROM "user";');
    });

    it('GET /tasks - rejects without token', () => {
      return request(httpServer).get('/tasks').expect(401);
    });

    it('POST /tasks - rejects without token', () => {
      return request(httpServer)
        .post('/tasks')
        .send({ title: 'x', description: 'y' })
        .expect(401);
    });

    it('GET /tasks/:id - rejects without token', () => {
      return request(httpServer).get('/tasks/some-id').expect(401);
    });

    it('PATCH /tasks/:id/status - rejects without token', () => {
      return request(httpServer)
        .patch('/tasks/some-id/status')
        .send({ status: 'DONE' })
        .expect(401);
    });

    it('DELETE /tasks/:id - rejects without token', () => {
      return request(httpServer).delete('/tasks/some-id').expect(401);
    });

    it('rejects fake token', () => {
      return request(httpServer)
        .get('/tasks')
        .set('Authorization', 'Bearer fake-token')
        .expect(401);
    });
  });

  describe('Tasks - CRUD & Ownership', () => {
    let token1: string;
    let token2: string;

    beforeAll(async () => {
      await request(httpServer)
        .post('/auth/signup')
        .send({ username: 'crud_alice', password: 'StrongPass1!' })
        .expect(201);
      const res1 = await request(httpServer)
        .post('/auth/signin')
        .send({ username: 'crud_alice', password: 'StrongPass1!' })
        .expect(201);
      token1 = res1.body.accessToken;

      await request(httpServer)
        .post('/auth/signup')
        .send({ username: 'crud_bob', password: 'StrongPass2@' })
        .expect(201);
      const res2 = await request(httpServer)
        .post('/auth/signin')
        .send({ username: 'crud_bob', password: 'StrongPass2@' })
        .expect(201);
      token2 = res2.body.accessToken;
    });

    afterAll(async () => {
      await dataSource.query('DELETE FROM task;');
      await dataSource.query('DELETE FROM "user";');
    });

    beforeEach(async () => {
      await dataSource.query('DELETE FROM task;');
    });

    it('POST /tasks - creates a task', async () => {
      const res = await request(httpServer)
        .post('/tasks')
        .set('Authorization', `Bearer ${token1}`)
        .send({ title: 'My Task', description: 'My Desc' })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('My Task');
      expect(res.body.description).toBe('My Desc');
      expect(res.body.status).toBe('OPEN');
    });

    it('GET /tasks - returns only own tasks', async () => {
      await request(httpServer)
        .post('/tasks')
        .set('Authorization', `Bearer ${token1}`)
        .send({ title: "Alice's task", description: 'A' })
        .expect(201);

      await request(httpServer)
        .post('/tasks')
        .set('Authorization', `Bearer ${token2}`)
        .send({ title: "Bob's task", description: 'B' })
        .expect(201);

      const res = await request(httpServer)
        .get('/tasks')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(res.body.length).toBe(1);
      expect(res.body[0].title).toBe("Alice's task");
    });

    it('GET /tasks/:id - cannot see another users task', async () => {
      const createRes = await request(httpServer)
        .post('/tasks')
        .set('Authorization', `Bearer ${token1}`)
        .send({ title: 'Secret', description: 'Only Alice' })
        .expect(201);
      const id = createRes.body.id;

      await request(httpServer)
        .get(`/tasks/${id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      return request(httpServer)
        .get(`/tasks/${id}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(404);
    });

    it('PATCH /tasks/:id/status - updates task status', async () => {
      const createRes = await request(httpServer)
        .post('/tasks')
        .set('Authorization', `Bearer ${token1}`)
        .send({ title: 'Update Me', description: 'Desc' })
        .expect(201);
      const id = createRes.body.id;

      const res = await request(httpServer)
        .patch(`/tasks/${id}/status`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ status: 'IN_PROGRESS' })
        .expect(200);

      expect(res.body.status).toBe('IN_PROGRESS');
    });

    it('PATCH /tasks/:id/status - cannot update another users task', async () => {
      const createRes = await request(httpServer)
        .post('/tasks')
        .set('Authorization', `Bearer ${token1}`)
        .send({ title: 'Mine', description: 'Dont touch' })
        .expect(201);
      const id = createRes.body.id;

      return request(httpServer)
        .patch(`/tasks/${id}/status`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ status: 'DONE' })
        .expect(404);
    });

    it('PATCH /tasks/:id/status - rejects invalid status', async () => {
      const createRes = await request(httpServer)
        .post('/tasks')
        .set('Authorization', `Bearer ${token1}`)
        .send({ title: 'Validate', description: 'This' })
        .expect(201);
      const id = createRes.body.id;

      return request(httpServer)
        .patch(`/tasks/${id}/status`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ status: 'INVALID' })
        .expect(400);
    });

    it('DELETE /tasks/:id - deletes own task', async () => {
      const createRes = await request(httpServer)
        .post('/tasks')
        .set('Authorization', `Bearer ${token1}`)
        .send({ title: 'Delete Me', description: 'Gone' })
        .expect(201);
      const id = createRes.body.id;

      await request(httpServer)
        .delete(`/tasks/${id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      return request(httpServer)
        .get(`/tasks/${id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(404);
    });

    it('DELETE /tasks/:id - cannot delete another users task', async () => {
      const createRes = await request(httpServer)
        .post('/tasks')
        .set('Authorization', `Bearer ${token1}`)
        .send({ title: 'Not Yours', description: 'Mine' })
        .expect(201);
      const id = createRes.body.id;

      return request(httpServer)
        .delete(`/tasks/${id}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(404);
    });
  });

  describe('Invalid routes', () => {
    it('GET /invalid - returns 404', () => {
      return request(httpServer).get('/invalid').expect(404);
    });

    it('POST /invalid - returns 404', () => {
      return request(httpServer).post('/invalid').send({}).expect(404);
    });
  });
});
