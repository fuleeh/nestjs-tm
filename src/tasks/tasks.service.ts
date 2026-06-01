import { Injectable, NotFoundException } from '@nestjs/common';
import { Task } from './task.entity';
import { TasksRepository } from './tasks.repository';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskStatus } from './task-status.enum';
import { GetTasksFilterDto } from './dto/get-tasks-filter.dto';
import { User } from 'src/auth/user.entity';

@Injectable()
export class TasksService {
  constructor(private tasksRepository: TasksRepository) {}

  async getTaskById(id: string, user: User): Promise<Task> {
    const found = await this.tasksRepository.findOne({
      where: { id, user: { id: user.id } },
    });
    if (!found) {
      throw new NotFoundException(`Task with ID "${id}" not found`);
    }
    return found;
  }

  async getTasks(filterDto: GetTasksFilterDto, user: User): Promise<Task[]> {
    return this.tasksRepository.getTasks(filterDto, user);
  }

  createTask(createTaskDto: CreateTaskDto, user: User): Promise<Task> {
    return this.tasksRepository.createTask(createTaskDto, user);
  }

  async updateTaskStatus(
    id: string,
    status: TaskStatus,
    user: User,
  ): Promise<Task> {
    const task = await this.getTaskById(id, user);
    task.status = status;
    await this.tasksRepository.save(task);
    return task;
  }

  async deleteTask(id: string, user: User): Promise<void> {
    const result = await this.tasksRepository.delete({
      id,
      user: { id: user.id },
    });
    if (result.affected === 0) {
      throw new NotFoundException(`Task with ID "${id}" not found`);
    }
  }
}
