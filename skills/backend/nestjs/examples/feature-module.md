# Feature module: controller, service, validated DTO

A feature module with a controller, a service, and a validated DTO:

```ts
// create-order.dto.ts
import { IsInt, IsPositive, IsString, Length } from "class-validator";

export class CreateOrderDto {
  @IsInt()
  @IsPositive()
  totalMinor!: number;

  @IsString()
  @Length(3, 3)
  currency!: string;
}
```

```ts
// orders.service.ts
import { Injectable } from "@nestjs/common";
import { CreateOrderDto } from "./create-order.dto";

@Injectable()
export class OrdersService {
  create(dto: CreateOrderDto) {
    return { id: "ord_01", ...dto, status: "created" };
  }
}
```

```ts
// orders.controller.ts
import { Body, Controller, Post } from "@nestjs/common";
import { CreateOrderDto } from "./create-order.dto";
import { OrdersService } from "./orders.service";

@Controller("orders")
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.orders.create(dto);
  }
}
```

```ts
// main.ts — global validation pipe
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
```
