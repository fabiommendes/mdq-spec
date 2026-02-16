type Result<Ok, Err> =
    | { ok: true; value: Ok }
    | { ok: false; error: Err };

type ParseError = {
    message: string;
    line?: number;
    column?: number;
};  