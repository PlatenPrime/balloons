export type HttpLikeResponse = {
  status: number;
  body: string;
};

export type HttpLikeRequest = {
  /** Pipeline stage id — required for FixtureTransport triage. */
  stageKey: string;
  url?: string;
  body?: string;
  method?: 'GET' | 'POST';
};

/** Narrow transport used by konk pipelines (fixture or live later). */
export type HttpLike = {
  request(req: HttpLikeRequest): Promise<HttpLikeResponse>;
};
