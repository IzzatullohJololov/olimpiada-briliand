<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Team application: no password — the organisers approve it and the login/password are emailed. */
class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'    => ['required', 'string', 'max:255'],                          // mas'ul shaxs ismi
            'email'   => ['required', 'email', 'max:255'],                           // band emasligi controllerda tekshiriladi
            'phone'   => ['required', 'string', 'max:50', 'regex:/^\+?[0-9 ()\-]{6,}$/'],
            'country' => ['required', 'string', 'max:100',
                Rule::unique('teams', 'country')->whereNull('archived_at')],         // faqat faol jamoalar orasida noyob
        ];
    }

    public function messages(): array
    {
        return [
            'country.unique' => 'This country has already registered a team.',
            'phone.regex' => 'Enter the phone number with the country code.',
        ];
    }
}
