import {
  type EventsResponse,
  OpenAPI,
  request,
  type ApplicationsResponse,
  type SchemasResponse,
  type EventApisResponse,
  type EventApiProductsResponse,
  type TopicAddressEnumsResponse,
} from '@solace-labs/ep-openapi-node';

class GenericService {
  protected static serviceEndpointPath: string;
  protected static errors = {
    400: `Bad Request.`,
    401: `Unauthorized.`,
    403: `Forbidden.`,
    404: `Not Found.`,
    405: `Method Not Allowed.`,
    500: `Internal Server Error.`,
    501: `Not Implemented.`,
    503: `Service Unavailable.`,
    504: `Gateway Timeout.`,
  };

  protected static init(serviceEndpointPath: string) {
    this.serviceEndpointPath = serviceEndpointPath;
  }

  protected static getOpenAPIConfig() {
    return OpenAPI;
  }
}

type BaseQuery = {
  pageNumber?: number;
  pageSize?: number;
};

export class SearchService extends GenericService {
  static {
    this.init('/api/v2/architecture/search');
  }

  private static async searchEntity<T>(
    entity: string,
    searchTerm: string,
    baseQuery?: BaseQuery,
  ): Promise<T> {
    const response = await request<T>(this.getOpenAPIConfig(), {
      method: 'GET',
      url: `${this.serviceEndpointPath}/${entity}`,
      query: {
        ...baseQuery,
        searchTerm,
      },
      errors: this.errors,
    });

    return response;
  }

  static async searchApplications(searchTerm: string, baseQuery?: BaseQuery) {
    return this.searchEntity<ApplicationsResponse>('applications', searchTerm, baseQuery);
  }

  static async searchEvents(searchTerm: string, baseQuery?: BaseQuery) {
    return this.searchEntity<EventsResponse>('events', searchTerm, baseQuery);
  }

  static async searchSchemas(searchTerm: string, baseQuery?: BaseQuery) {
    return this.searchEntity<SchemasResponse>('schemas', searchTerm, baseQuery);
  }

  static async searchEnumerations(searchTerm: string, baseQuery?: BaseQuery) {
    return this.searchEntity<TopicAddressEnumsResponse>('enums', searchTerm, baseQuery);
  }

  static async searchEventAPIs(searchTerm: string, baseQuery?: BaseQuery) {
    return this.searchEntity<EventApisResponse>('eventApis', searchTerm, baseQuery);
  }

  static async searchEventAPIProducts(searchTerm: string, baseQuery?: BaseQuery) {
    return this.searchEntity<EventApiProductsResponse>('eventApiProducts', searchTerm, baseQuery);
  }
}
