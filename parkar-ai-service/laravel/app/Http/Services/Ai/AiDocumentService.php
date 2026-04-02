<?php

namespace App\Http\Services\Ai;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * AiDocumentService
 * -----------------
 * Sends an uploaded image to the Python AI microservice and returns
 * a structured analysis result.
 *
 * Expected JSON response from the microservice:
 * {
 *   "is_car_document": true|false,
 *   "clarity":         "clear"|"unclear",
 *   "confidence":      0.0-1.0,
 *   "issues":          string[]
 * }
 */
class AiDocumentService
{
    private string $baseUrl;
    private int $timeoutSeconds;

    public function __construct()
    {
        // Set AI_SERVICE_URL=http://localhost:5001 (or Docker service name) in .env
        $this->baseUrl      = rtrim((string) config('services.ai_document.url', 'http://localhost:5001'), '/');
        $this->timeoutSeconds = (int) config('services.ai_document.timeout', 30);
    }

    /**
     * Analyse a single uploaded file.
     *
     * @return array{
     *   is_car_document: bool,
     *   clarity: string,
     *   confidence: float,
     *   issues: string[],
     *   error?: string
     * }
     */
    public function analyse(UploadedFile $file): array
    {
        try {
            $response = Http::timeout($this->timeoutSeconds)
                ->attach('image', fopen($file->getRealPath(), 'r'), $file->getClientOriginalName())
                ->post("{$this->baseUrl}/analyse");

            if ($response->failed()) {
                Log::warning('AI service returned non-2xx', [
                    'status' => $response->status(),
                    'body'   => $response->body(),
                ]);

                return $this->fallback("AI service error (HTTP {$response->status()})");
            }

            $data = $response->json();

            // Validate expected keys are present
            if (
                ! isset($data['is_car_document'], $data['clarity'], $data['confidence'], $data['issues'])
            ) {
                Log::warning('AI service returned unexpected shape', ['data' => $data]);
                return $this->fallback('Unexpected AI response shape.');
            }

            return [
                'is_car_document' => (bool)  $data['is_car_document'],
                'clarity'         => (string) $data['clarity'],
                'confidence'      => (float)  $data['confidence'],
                'issues'          => (array)  $data['issues'],
            ];

        } catch (ConnectionException $e) {
            Log::error('AI service unreachable', ['error' => $e->getMessage()]);
            return $this->fallback('AI service unreachable – document accepted for manual review.');
        }
    }

    /**
     * Health check – returns true if microservice is up.
     */
    public function isHealthy(): bool
    {
        try {
            return Http::timeout(5)->get("{$this->baseUrl}/health")->successful();
        } catch (\Throwable) {
            return false;
        }
    }

    // ── Private helpers ─────────────────────────────────────────────────────

    private function fallback(string $reason): array
    {
        return [
            'is_car_document' => true,   // fail open – let admin review manually
            'clarity'         => 'unclear',
            'confidence'      => 0.0,
            'issues'          => ['ai_service_unavailable'],
            'error'           => $reason,
        ];
    }
}
