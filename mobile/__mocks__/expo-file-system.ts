// Only the native file boundary is mocked; no private files are accessed in tests.
export class File {
  readonly uri: string;
  readonly name = 'synthetic.png';
  readonly type = 'image/png';
  bytes = jest.fn(async () => new Uint8Array([137, 80, 78, 71]));
  create = jest.fn();
  copy = jest.fn();
  move = jest.fn();
  delete = jest.fn();
  constructor(uri: string) { this.uri = uri; }
}
