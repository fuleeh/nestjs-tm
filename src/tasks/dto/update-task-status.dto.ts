import { IsEnum } from 'class-validator';
import { TaskStatus } from '../task-status.enum';

export class UpdateTaskStatusDto {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @IsEnum(TaskStatus)
  status: TaskStatus;
}
