<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Throwable;

class Handler extends ExceptionHandler
{
    /**
     * The list of the inputs that are never flashed to the session on validation exceptions.
     *
     * @var array<int, string>
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Register the exception handling callbacks for the application.
     */
    public function register(): void
    {
        $this->reportable(function (Throwable $e) {
            //
        });
    }

    public function render($request, Throwable $exception)
    {
        // In debug mode, use the parent renderer so we can see full exception details.
        if (config('app.debug')) {
            return parent::render($request, $exception);
        }

        if ($exception instanceof BadRequestHttpException) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 400);
        }

        // Default response for unexpected exceptions (production-safe)
        return response()->json([
            'error' => true,
            'message' => 'An unexpected error occurred',
        ], 500);
    }

}
