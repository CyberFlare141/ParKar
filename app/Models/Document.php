<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Model;

class Document extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'document_type',
        'file_path',
        'expiry_date',
        'is_verified',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function applications(): BelongsToMany
    {
        return $this->belongsToMany(
            ParkingApplication::class,
            'application_documents',
            'document_id',
            'application_id'
        )->withPivot('created_at');
    }
}
