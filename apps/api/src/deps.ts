import type {
  CatalogStore,
  ManufacturerDaySalesStore,
  PageSource,
  SliceStore,
} from '@balloons/domain';
import type { ExcelJobQueue } from '@balloons/reporting';
import type { SliceJobQueue } from '@balloons/slice-engine';
import type { AuthService } from './auth/authService.js';

export type AppDeps = {
  catalog: CatalogStore;
  slices: SliceStore;
  sales: ManufacturerDaySalesStore;
  pageSource: PageSource;
  sliceJobs: SliceJobQueue;
  excelJobs: ExcelJobQueue;
  auth: AuthService;
  corsOrigins: string[];
};
