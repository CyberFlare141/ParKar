<?php

namespace App\Http\Services\Ai;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AiDocumentService
{
    public function __construct(
        private readonly ?string $baseUrl = null,
        private readonly ?int $timeoutSeconds = null,
    ) {
    }

    public function analyse(UploadedFile $file): array
    {
        $baseUrl = rtrim((string) ($this->baseUrl ?? config('services.ai_document.url', 'http://localhost:5001')), '/');
        $timeout = (int) ($this->timeoutSeconds ?? config('services.ai_document.timeout', 30));

        try {
            $response = Http::timeout($timeout)
                ->attach('image', fopen($file->getRealPath(), 'r'), $file->getClientOriginalName())
                ->post("{$baseUrl}/analyse");

            if ($response->failed()) {
                Log::warning('AI service returned non-2xx response.', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return $this->fallback("AI service error (HTTP {$response->status()}).");
            }

            $data = $response->json();

            if (!isset($data['is_car_document'], $data['clarity'], $data['confidence'], $data['issues'])) {
                Log::warning('AI service returned unexpected response shape.', [
                    'payload' => $data,
                ]);

                return $this->fallback('Unexpected AI response shape.');
            }

            return [
                'is_car_document' => (bool) $data['is_car_document'],
                'clarity' => (string) $data['clarity'],
                'confidence' => (float) $data['confidence'],
                'issues' => array_values(array_map('strval', (array) $data['issues'])),
                'error' => isset($data['error']) ? (string) $data['error'] : null,
            ];
        } catch (ConnectionException $exception) {
            Log::warning('AI service is unreachable.', [
                'message' => $exception->getMessage(),
            ]);

            return $this->fallback('AI service unreachable. Documents were accepted for manual review.');
        }
    }

    private function fallback(string $reason): array
    {
        return [
            'is_car_document' => true,
            'clarity' => 'unclear',
            'confidence' => 0.0,
            'issues' => ['ai_service_unavailable'],
            'error' => $reason,
        ];
    }
}
