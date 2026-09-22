/**
 * A refused visualize request, and why.
 *
 * The status is part of the error rather than the route's guess, because the
 * distinction matters to the user: a hidden or out-of-range case is *their*
 * request being wrong (400), while an unreachable engine is the environment's
 * (500). Neither one is ever answered with a picture.
 */
export class VisualizerError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "VisualizerError";
    this.status = status;
  }
}
