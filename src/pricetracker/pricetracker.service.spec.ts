import { Test, TestingModule } from '@nestjs/testing';
import { PricetrackerService } from './pricetracker.service';

describe('PricetrackerService', () => {
  let service: PricetrackerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PricetrackerService],
    }).compile();

    service = module.get<PricetrackerService>(PricetrackerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
