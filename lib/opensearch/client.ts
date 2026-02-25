import { Client } from '@opensearch-project/opensearch';

const nodeUrl = process.env.OPENSEARCH_URL ?? 'http://localhost:9200';
const indexName = process.env.OPENSEARCH_INDEX ?? 'recipes';

export const opensearchClient = new Client({ node: nodeUrl });
export const OPENSEARCH_INDEX = indexName;
