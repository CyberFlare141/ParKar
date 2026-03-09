<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ParkingTicket extends Model
{
    use HasFactory;

    protected $fillable = [
        'ticket_id',
        'application_id',
        'issue_date',
        'parking_slot',
    ];

    protected $casts = [
        'issue_date' => 'datetime',
    ];

    public function application(): BelongsTo
    {
        return $this->belongsTo(ParkingApplication::class, 'application_id');
    }
}

