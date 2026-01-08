import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Restaurant } from "./Restaurant";
import { Screen } from "./Screen";

export enum Role {
  SUPER_ADMIN = "SUPER_ADMIN",
  RESTAURANT = "RESTAURANT",
  SCREEN = "SCREEN",
  USER = "USER",
}

@Entity()
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ unique: true })
  username!: string;

  @Column()
  passwordHash!: string;

  @Column({
    type: "enum",
    enum: Role,
    default: Role.SUPER_ADMIN,
  })
  role!: Role;

  @Column({ nullable: true })
  restaurantId?: string;

  @ManyToOne(() => Restaurant)
  @JoinColumn({ name: "restaurantId" })
  restaurant?: Restaurant;

  @Column({ nullable: true })
  screenId?: string;

  @ManyToOne(() => Screen)
  @JoinColumn({ name: "screenId" })
  screen?: Screen;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
