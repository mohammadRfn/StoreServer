<?php

declare(strict_types=1);

namespace Modules\Audit\Services;

use RuntimeException;

// دسته‌ی لاگ از سقف حجم مجاز inbox بزرگ‌تر است (کنترلر آن را به 413 تبدیل می‌کند)
class PayloadTooLargeException extends RuntimeException {}