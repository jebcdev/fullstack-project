import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { UserRole } from '../enums/user-role.enum';

@Entity('users')
export class User {
  @ApiProperty({
    description: 'Identificador único universal (UUID v4) del usuario',
    example: 'd9b2b63d-a233-4f9e-bfb7-2009e450b3e5',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Correo electrónico único del usuario',
    example: 'usuario@ejemplo.com',
    format: 'email',
  })
  @Index({ unique: true })
  @Column({ unique: true })
  email: string;

  @ApiProperty({
    description: 'Rol del usuario en el sistema',
    enum: UserRole,
    example: UserRole.USER,
  })
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @ApiProperty({
    description: 'Nombre del usuario',
    example: 'Juan',
  })
  @Column()
  name: string;

  @ApiProperty({
    description: 'Apellido del usuario',
    example: 'Pérez',
  })
  @Column({ name: 'last_name' })
  lastName: string;

  @Exclude()
  @Column()
  password: string;

  @ApiProperty({
    description: 'Estado de actividad del usuario en el sistema',
    example: true,
  })
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @ApiProperty({
    description: 'Fecha y hora de creación del registro',
    example: '2026-11-06T10:00:00.000Z',
    format: 'date-time',
  })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({
    description: 'Fecha y hora de la última actualización del registro',
    example: '2026-11-06T10:00:00.000Z',
    format: 'date-time',
  })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
