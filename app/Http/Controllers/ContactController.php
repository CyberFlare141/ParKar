<?php

namespace App\Http\Controllers;

use App\Mail\ContactMessageMail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class ContactController extends Controller
{
    public function send(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'full_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email:rfc', 'max:255'],
            'subject' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:5000'],
        ]);

        $rawRecipients = (string) env('CONTACT_AUTHORITY_EMAILS', '');
        $recipients = collect(explode(',', $rawRecipients))
            ->map(fn ($email) => trim((string) $email))
            ->filter(fn ($email) => $email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL))
            ->unique()
            ->values()
            ->all();

        if (empty($recipients)) {
            return response()->json([
                'message' => 'Contact email is not configured. Please try again later.',
            ], 500);
        }

        $details = [
            'sender_name' => trim((string) $payload['full_name']),
            'sender_email' => strtolower(trim((string) $payload['email'])),
            'subject' => trim((string) $payload['subject']),
            'message' => trim((string) $payload['message']),
            'sent_at' => now()->toDateTimeString(),
        ];

        Mail::to($recipients)
            ->replyTo($details['sender_email'], $details['sender_name'])
            ->send(new ContactMessageMail($details));

        return response()->json([
            'message' => 'Your message has been sent successfully. Our team will respond shortly.',
        ]);
    }
}
