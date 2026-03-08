<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Contact Message</title>
</head>
<body style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
    <h2 style="margin-bottom: 12px;">New Contact Message</h2>

    <p style="margin: 6px 0;"><strong>Sender Name:</strong> {{ $details['sender_name'] }}</p>
    <p style="margin: 6px 0;"><strong>Sender Email:</strong> {{ $details['sender_email'] }}</p>
    <p style="margin: 6px 0;"><strong>Subject:</strong> {{ $details['subject'] }}</p>
    <p style="margin: 6px 0;"><strong>Timestamp:</strong> {{ $details['sent_at'] }}</p>

    <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 16px 0;">

    <p style="margin: 6px 0 8px;"><strong>Message:</strong></p>
    <p style="margin: 0; white-space: pre-wrap;">{{ $details['message'] }}</p>
</body>
</html>
