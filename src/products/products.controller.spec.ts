import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { MailerService } from 'src/mailer/mailer.service';
import { create } from 'domain';
import { productMock, productMock2 } from 'src/mocks/product.mock';
import { productAddedEmailTemplate } from 'src/mailer/html.templates';
import { AuthGuard } from 'src/guards/auth.guard';
import { guardMock } from 'src/mocks/guard.mock';
import { CreateProductDto } from './dto/create.product.dto';
import {
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { FindByUserUidDto } from './dto/find.by.user.uid.dto';
import { FindOneProductDto } from './dto/find.one.product.dto';
import { UpdateProductDto } from './dto/update.product.dto';

describe('ProductsController', () => {
    let controller: ProductsController;
    let productsService: ProductsService;
    let mailerService: MailerService;

    const mockProductsService = {
        create: jest.fn(),
        findAll: jest.fn(),
        findByUserUid: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        remove: jest.fn(),
        removeAllByUserUid: jest.fn(),
    };

    const mockMailerService = {
        sendMailWithHTML: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ProductsController],
            providers: [
                { provide: ProductsService, useValue: mockProductsService },
                { provide: MailerService, useValue: mockMailerService },
            ],
        })
            .overrideGuard(AuthGuard)
            .useValue(guardMock)
            .compile();

        controller = module.get<ProductsController>(ProductsController);
        productsService = module.get<ProductsService>(ProductsService);
        mailerService = module.get<MailerService>(MailerService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('create', () => {
        it('should call productsService.create and mailerService.sendMailWithHTML', async () => {
            mockProductsService.create.mockResolvedValue([productMock]);
            mockMailerService.sendMailWithHTML.mockResolvedValue(true);

            await controller.create(productMock);
            expect(mockProductsService.create).toHaveBeenCalledWith(
                productMock,
            );
            expect(mockMailerService.sendMailWithHTML).toHaveBeenCalledWith(
                productMock.user_email,
                'New product created',
                productAddedEmailTemplate(productMock.url),
            );
        });

        it('should throw if productsService.create throws', async () => {
            const dto: CreateProductDto = {
                user_uid: 'user123',
                user_email: 'user@example.com',
                url: 'https://example.com/product',
            };

            mockProductsService.create.mockRejectedValue(
                new InternalServerErrorException(),
            );

            await expect(controller.create(dto)).rejects.toThrow(
                InternalServerErrorException,
            );
            expect(mailerService.sendMailWithHTML).not.toHaveBeenCalled();
        });

        it('should throw if mailerService.sendMailWithHTML throws', async () => {
            const dto: CreateProductDto = {
                user_uid: 'user123',
                user_email: 'user@example.com',
                url: 'https://example.com/product',
            };

            mockProductsService.create.mockResolvedValue([{ id: 1 }]);
            mockMailerService.sendMailWithHTML.mockRejectedValue(
                new InternalServerErrorException(),
            );

            await expect(controller.create(dto)).rejects.toThrow(
                InternalServerErrorException,
            );
        });
    });

    describe('findAll', () => {
        it('should call productsService.findByUserUid with the correct DTO', async () => {
            const dto: FindByUserUidDto = {
                user_uid: productMock.user_uid,
            };

            const mockResult = [productMock, productMock2];

            mockProductsService.findByUserUid.mockResolvedValue(mockResult);

            const result = await controller.findAll(dto);

            expect(mockProductsService.findByUserUid).toHaveBeenCalledWith(dto);
            expect(result).toEqual(mockResult);
        });

        it('should throw if productsService.findByUserUid throws', async () => {
            const dto: FindByUserUidDto = {
                user_uid: productMock.user_uid,
            };

            mockProductsService.findByUserUid.mockRejectedValue(
                new InternalServerErrorException(),
            );

            await expect(controller.findAll(dto)).rejects.toThrow(
                InternalServerErrorException,
            );
        });
    });

    describe('findOne', () => {
        it('should call productsService.findOne with the correct DTO', async () => {
            const dto: FindOneProductDto = { id: productMock.id };

            mockProductsService.findOne.mockResolvedValue([productMock]);

            const result = await controller.findOne(dto);

            expect(mockProductsService.findOne).toHaveBeenCalledWith(dto);
            expect(result).toEqual([productMock]);
        });

        it('should throw if productsService.findOne throws NotFoundException', async () => {
            const dto: FindOneProductDto = { id: productMock.id };

            mockProductsService.findOne.mockRejectedValue(
                new NotFoundException(),
            );

            await expect(controller.findOne(dto)).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe('update', () => {
        it('should call productsService.update with correct parameters and return result', async () => {
            const updateDto: UpdateProductDto = {
                current_price: 59.99,
                last_checked_at: new Date().toISOString(),
            };

            const mockResponse = [{ id: productMock.id, ...updateDto }];
            mockProductsService.update.mockResolvedValue(mockResponse);

            const result = await controller.update(
                String(productMock.id),
                updateDto,
            );

            expect(mockProductsService.update).toHaveBeenCalledWith(
                productMock.id,
                updateDto,
            );
            expect(result).toEqual(mockResponse);
        });

        it('should throw if productsService.update throws InternalServerErrorException', async () => {
            const updateDto: UpdateProductDto = {
                current_price: 79.99,
            };

            mockProductsService.update.mockRejectedValue(
                new InternalServerErrorException(),
            );

            await expect(
                controller.update(String(productMock.id), updateDto),
            ).rejects.toThrow(InternalServerErrorException);
        });
    });

    describe('remove', () => {
        it('should call productsService.remove with the correct ID and return result', async () => {
            const mockResult = [];

            mockProductsService.remove.mockResolvedValue(mockResult);

            const result = await controller.remove(String(productMock.id));

            expect(mockProductsService.remove).toHaveBeenCalledWith(
                productMock.id,
            );
            expect(result).toEqual(mockResult);
        });

        it('should throw if productsService.remove throws NotFoundException', async () => {
            mockProductsService.remove.mockRejectedValue(
                new NotFoundException(),
            );

            await expect(
                controller.remove(String(productMock.id)),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('removeAllByUserUid', () => {
        it('should call productsService.removeAllByUserUid with the correct user_uid and return result', async () => {
            const dto = { user_uid: productMock.user_uid };
            const mockResult = [productMock, productMock2];

            mockProductsService.removeAllByUserUid.mockResolvedValue(
                mockResult,
            );

            const result = await controller.removeAllByUserUid(dto);

            expect(mockProductsService.removeAllByUserUid).toHaveBeenCalledWith(
                dto.user_uid,
            );
            expect(result).toEqual(mockResult);
        });

        it('should throw if productsService.removeAllByUserUid throws', async () => {
            const dto = { user_uid: productMock.user_uid };

            mockProductsService.removeAllByUserUid.mockRejectedValue(
                new InternalServerErrorException(),
            );

            await expect(controller.removeAllByUserUid(dto)).rejects.toThrow(
                InternalServerErrorException,
            );
        });
    });
});
