import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('dracula')
export class Dracula {
  @PrimaryGeneratedColumn({ name: 'Id_Dracula' })
  id: number;

  @Column({ name: 'Placa', length: 20 })
  placa: string;

  @Column({ name: 'Color', length: 50 })
  color: string;
}