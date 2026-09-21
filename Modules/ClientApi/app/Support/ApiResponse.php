<?php

declare(strict_types=1);

namespace Modules\ClientApi\Support;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

// فرمت یکسان پاسخ و خطا برای همه اندپوینت‌های v1
final class ApiResponse
{
    /** @param array<string, mixed> $data */
    public static function success(array $data = [], int $status = 200): JsonResponse
    {
        return response()->json([
            'ok'   => true,
            'data' => $data,
            'meta' => self::meta(),
        ], $status);
    }

    /** @param array<string, mixed> $details */
    public static function error(string $code, string $message, int $status = 400, array $details = []): JsonResponse
    {
        return response()->json([
            'ok'    => false,
            'error' => array_filter([
                'code'    => $code,
                'message' => $message,
                'details' => $details === [] ? null : $details,
            ], static fn ($v) => $v !== null),
            'meta' => self::meta(),
        ], $status);
    }

    // پاسخ قفل (suspend / expire / revoke)
    public static function locked(string $code, string $message, string $licenseStatus): JsonResponse
    {
        return response()->json([
            'ok'    => false,
            'error' => ['code' => $code, 'message' => $message],
            'data'  => ['locked' => true, 'license_status' => $licenseStatus],
            'meta'  => self::meta(),
        ], 403);
    }

    public static function fromException(Throwable $e): JsonResponse
    {
        if ($e instanceof ValidationException) {
            return self::error('VALIDATION_ERROR', 'داده‌های ارسالی معتبر نیست.', 422, $e->errors());
        }

        if ($e instanceof HttpExceptionInterface) {
            $status = $e->getStatusCode();

            return self::error(match ($status) {
                401 => 'TOKEN_INVALID',
                403 => 'FORBIDDEN',
                404 => 'NOT_FOUND',
                429 => 'RATE_LIMITED',
                default => 'BAD_REQUEST',
            }, $e->getMessage() !== '' ? $e->getMessage() : 'درخواست نامعتبر است.', $status);
        }

        report($e);

        return self::error('SERVER_ERROR', 'خطای داخلی سرور.', 500);
    }

    /** @return array<string, string> */
    private static function meta(): array
    {
        return [
            'request_id'  => (string) (request()?->attributes->get('request_id') ?? Str::uuid()),
            'server_time' => now()->utc()->toIso8601String(),
        ];
    }
}
