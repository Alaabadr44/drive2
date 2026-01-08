import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import { Menu } from "./Menu";
import { ScreenRestaurantConfig } from "./ScreenRestaurantConfig";
import { CallSession } from "./CallSession";

export enum RestaurantStatus {
  AVAILABLE = "AVAILABLE",
  BUSY = "BUSY",
  OFFLINE = "OFFLINE",
}

@Entity()
export class Restaurant {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  nameAr!: string;

  @Column()
  nameEn!: string;

  @Column({ type: "text", nullable: true })
  logoUrl?: string;

  @Column({ nullable: true })
  contactPhone?: string;

  @Column({ nullable: true })
  sipExtension?: string;

  @Column({ default: true })
  isVisible!: boolean;

  @Column({
    type: "enum",
    enum: RestaurantStatus,
    default: RestaurantStatus.AVAILABLE,
  })
  status!: RestaurantStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => Menu, (menu: Menu) => menu.restaurant)
  menus!: Menu[];

  @OneToMany(() => ScreenRestaurantConfig, (config: ScreenRestaurantConfig) => config.restaurant)
  screenConfigs!: ScreenRestaurantConfig[];

  @OneToMany(() => CallSession, (session: CallSession) => session.restaurant)
  callSessions!: CallSession[];

  @Column({ default: true })
  isActive!: boolean;

  @OneToMany("User", (user: any) => user.restaurant)
  users!: any[];
}
