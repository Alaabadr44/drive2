import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import { ScreenRestaurantConfig } from "./ScreenRestaurantConfig";
import { CallSession } from "./CallSession";

@Entity()
export class Screen {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  name!: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ default: 'both' })
  showLanguage!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => ScreenRestaurantConfig, (config) => config.screen)
  restaurantConfigs!: ScreenRestaurantConfig[];

  @OneToMany(() => CallSession, (session) => session.screen)
  callSessions!: CallSession[];

  @OneToMany("User", (user: any) => user.screen)
  users!: any[];
}
