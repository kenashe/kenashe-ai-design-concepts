// Shell regions shared by every page: header, footer, JSON-LD.
import { header, footer, jsonLdPerson } from '../components.js';
export const shell = {
  header: (graph, ctx) => header(ctx),
  footer: (graph, ctx) => footer(graph, ctx),
  jsonld: (graph) => jsonLdPerson(graph),
};
