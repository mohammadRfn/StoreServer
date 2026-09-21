<?php

declare(strict_types=1);

namespace Modules\ClientApi\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;
use Modules\Base\Models\SigningKey;
use Modules\ClientApi\Support\ApiResponse;

class PublicKeyController extends Controller
{
    // GET /api/v1/keys
    public function __invoke(): JsonResponse
    {
        $keys = SigningKey::query()
            ->whereIn('status', ['active', 'retired'])
            ->orderByDesc('id')
            ->get(['kid', 'algorithm', 'public_key', 'status'])
            ->map(fn (SigningKey $key): array => [
                'kid'        => $key->kid,
                'alg'        => $key->algorithm,
                'public_key' => $key->public_key,
                'status'     => $key->status,
            ])
            ->all();

        return ApiResponse::success(['keys' => $keys]);
    }
}
