import { HttpAgent } from '@ag-ui/client';

const DASHBOARD_URL = 'http://localhost:3000/dashboard';

export const DASHBOARD_AGENT_ID = 'dashboard';

export const dashboardAgent = new HttpAgent({ url: DASHBOARD_URL });
