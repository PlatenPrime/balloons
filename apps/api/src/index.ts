import { createApp } from './app.js';
import { createAppDeps } from './composition.js';

const port = Number(process.env.PORT) || 3000;

const deps = await createAppDeps({
  useInProcessExcelBuild: process.env.EXCEL_IN_PROCESS === '1',
});
const app = createApp(deps);

app.listen(port, () => {
  console.log(`balloons api listening on http://localhost:${port}`);
});
