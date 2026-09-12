// A fixture that fails validation becomes this typed error, which API routes
// turn into a { error } JSON response with a 4xx status — never a crash.
// (Architecture Spine, Consistency Conventions: "API errors are { error:
// string } ... never a bare crash.")
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
