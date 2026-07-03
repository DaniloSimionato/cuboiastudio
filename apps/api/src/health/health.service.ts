import { Injectable } from "@nestjs/common";

export type HealthResponse = {
  ok: true;
};

@Injectable()
export class HealthService {
  getStatus(): HealthResponse {
    return {
      ok: true,
    };
  }
}
