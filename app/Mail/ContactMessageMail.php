<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ContactMessageMail extends Mailable
{
    use Queueable;
    use SerializesModels;

    public function __construct(public array $details)
    {
    }

    public function build(): self
    {
        return $this
            ->subject('New Contact Message: ' . $this->details['subject'])
            ->view('emails.contact-message');
    }
}
