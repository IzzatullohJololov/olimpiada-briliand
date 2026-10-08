<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, Notifiable;

    protected $fillable = ['name', 'email', 'phone', 'password'];   // is_admin ataylab fillable emas

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_admin' => 'boolean',
        ];
    }

    /** The current (not archived) team of this responsible person. */
    public function team(): HasOne
    {
        return $this->hasOne(Team::class)->ofMany(['id' => 'max'], fn ($q) => $q->whereNull('archived_at'));
    }

    /** All teams, including the archived ones of previous seasons. */
    public function teams(): HasMany
    {
        return $this->hasMany(Team::class);
    }
}
