import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from "typeorm";
import { Screen } from "./Screen";
import { Restaurant } from "./Restaurant";

@Entity()
@Unique(["screenId", "restaurantId"])
export class ScreenRestaurantConfig {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  screenId!: string;

  @Column()
  restaurantId!: string;

  @Column({ default: true })
  isVisibleOnScreen!: boolean;

  @ManyToOne(() => Screen, (screen) => screen.restaurantConfigs, { onDelete: "CASCADE" })
  @JoinColumn({ name: "screenId" })
  screen!: Screen;

  @ManyToOne(() => Restaurant, (restaurant) => restaurant.screenConfigs, { onDelete: "CASCADE" })
  @JoinColumn({ name: "restaurantId" })
  restaurant!: Restaurant;
}
