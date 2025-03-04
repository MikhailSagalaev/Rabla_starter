import {
  createApiKeysWorkflow,
  createCollectionsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createProductTypesWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  uploadFilesWorkflow,
} from '@medusajs/medusa/core-flows';
import {
  ExecArgs,
  IFulfillmentModuleService,
  ISalesChannelModuleService,
  IStoreModuleService,
} from '@medusajs/framework/types';
import {
  ContainerRegistrationKeys,
  Modules,
} from '@medusajs/framework/utils';

async function getImageUrlContent(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch image "${url}": ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('binary');
}

export default async function seedDemoData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const fulfillmentModuleService: IFulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const salesChannelModuleService: ISalesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const storeModuleService: IStoreModuleService = container.resolve(Modules.STORE);

  // Очистка существующих данных
  logger.info('Clearing existing data...');
  await container.get('database').query('DELETE FROM tax_region;');
  await container.get('database').query('DELETE FROM region;');
  await container.get('database').query('DELETE FROM shipping_profiles;');
  await container.get('database').query('DELETE FROM sales_channels;');

  // Создание канала продаж по умолчанию
  logger.info('Seeding store data...');
  const [store] = await storeModuleService.listStores();
  let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: 'Default Sales Channel',
  });

  if (!defaultSalesChannel.length) {
    const { result: salesChannelResult } = await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: [
          {
            name: 'Default Sales Channel',
          },
        ],
      },
    });
    defaultSalesChannel = salesChannelResult;
  }

  // Создание регионов
  logger.info('Seeding region data...');
  const countries = ['hr', 'gb', 'de', 'dk', 'se', 'fr', 'es', 'it'];
  const { result: regionResult } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: 'Europe',
          currency_code: 'eur',
          countries,
          payment_providers: ['pp_stripe_stripe'],
        },
      ],
    },
  });

  // Создание налоговых регионов
  logger.info('Seeding tax regions...');
  await createTaxRegionsWorkflow(container).run({
    input: countries.map((country_code) => ({
      country_code,
    })),
  });

  // Создание профилей доставки
  logger.info('Seeding shipping profiles...');
  const { result: shippingProfileResult } = await createShippingProfilesWorkflow(container).run({
    input: {
      profiles: [
        {
          name: 'Default',
          provider_id: 'manual',
          fulfillment_type: 'manual',
        },
      ],
    },
  });

  // Создание складских локаций
  logger.info('Seeding stock locations...');
  await createStockLocationsWorkflow(container).run({
    input: {
      locations: [
        {
          name: 'Default Location',
          address: {
            city: 'City',
            country_code: 'US',
            postal_code: '12345',
            state: 'State',
            street: '123 Main St',
          },
        },
      ],
    },
  });

  // Загрузка файлов
  logger.info('Uploading files...');
  const imageUrls = [
    'https://assets.agilo.com/fashion-starter/products/example/image.png',
  ];
  const uploadedFiles = await Promise.all(imageUrls.map(url => uploadFilesWorkflow(container).run({
    input: {
      files: [
        {
          access: 'public',
          filename: url.split('/').pop(),
          mimeType: 'image/png',
          content: await getImageUrlContent(url),
        },
      ],
    },
  })));

  logger.info('Finished seeding data.');
}