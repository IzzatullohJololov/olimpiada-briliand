<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Participant extends Model
{
    public const STATUSES = ['team_leader', 'team_leader_jury', 'observer', 'student'];
    public const GROUPS = ['alpha', 'beta', 'gamma'];
    public const DIETS = ['standard', 'vegetarian', 'avoid_pork'];
    public const LANGUAGES = ['russian', 'english', 'both'];
    public const TSHIRTS = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

    protected $guarded = ['id', 'team_id'];

    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
            'passport_issue_date' => 'date',
            'passport_expiry_date' => 'date',
            'previous_prizewinner' => 'boolean',
            'needs_visa_invitation' => 'boolean',
        ];
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }
}
