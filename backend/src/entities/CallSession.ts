import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Screen } from "./Screen";
import { Restaurant } from "./Restaurant";

export enum CallStatus {
  INITIATED = "INITIATED",
  RINGING = "RINGING",
  ACTIVE = "ACTIVE",
  ENDED = "ENDED",
  MISSED = "MISSED",
  REJECTED = "REJECTED",
}

@Entity()
export class CallSession {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  kioskId!: string; // Using Screen ID

  @Column()
  restaurantId!: string;

  @CreateDateColumn()
  startTime!: Date;

  @Column({ nullable: true })
  endTime?: Date;

  @Column({
    type: "enum",
    enum: CallStatus,
    default: CallStatus.INITIATED,
  })
  status!: CallStatus;

  @Column({
    type: "enum",
    enum: ["SCREEN", "RESTAURANT"],
    default: "SCREEN"
  })
  initiatedBy!: "SCREEN" | "RESTAURANT";

  @Column({ nullable: true })
  durationSec?: number;

  @Column({ nullable: true })
  orderNumber?: string;

  @Column({ nullable: true })
  recordingUrl?: string;

  @ManyToOne(() => Screen, (screen) => screen.callSessions)
  @JoinColumn({ name: "kioskId" })
  screen!: Screen;

  @ManyToOne(() => Restaurant, (restaurant) => restaurant.callSessions)
  @JoinColumn({ name: "restaurantId" })
  restaurant!: Restaurant;
}
