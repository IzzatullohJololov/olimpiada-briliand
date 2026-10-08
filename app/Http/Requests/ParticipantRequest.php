<?php

namespace App\Http\Requests;

use App\Models\Participant;
use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ParticipantRequest extends FormRequest
{
    private const DATE_FIELDS = ['birth_date', 'passport_issue_date', 'passport_expiry_date'];

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $update = $this->isMethod('PUT') || $this->isMethod('PATCH');
        $req = $update ? 'sometimes' : 'required';          // update'da faqat yuborilgan maydonlar tekshiriladi
        $visa = $update ? ['sometimes', 'nullable'] : ['required_if:needs_visa_invitation,1,true'];

        // Faqat 26 ta lotin harfi; faqat BOSH HARFLARDA yozish xato (ko'rsatma bo'yicha)
        $latin = ['string', 'max:100', "regex:/^[A-Za-z][A-Za-z\\s.'\\-]*$/", "not_regex:/^[A-Z\\s.'\\-]+$/"];

        return [
            'status'  => [$req, Rule::in(Participant::STATUSES)],
            'student_group' => ['nullable', 'required_if:status,student', Rule::in(Participant::GROUPS)],
            'previous_prizewinner'  => ['sometimes', 'boolean'],
            'needs_visa_invitation' => ['sometimes', 'boolean'],

            // 1-5
            'family_name_en'     => [$req, ...$latin],                   // 1.1
            'first_name_en'      => [$req, ...$latin],                   // 1.2
            'family_name_native' => [$req, 'string', 'max:100'],         // 2.1 (istalgan yozuv)
            'first_name_native'  => [$req, 'string', 'max:100'],         // 2.2
            'birth_date'         => [$req, 'date_format:d.m.Y', 'before:today'], // 3
            'birth_place'        => [$req, 'string', 'max:255'],         // 4
            'sex'                => [$req, Rule::in(['male', 'female'])],// 5

            // 6
            'citizenship'        => [$req, 'string', 'max:100'],         // 6.1
            'other_citizenships' => ['nullable', 'string', 'max:255'],   // 6.2
            'ethnicity'          => ['nullable', 'string', 'max:255'],   // 6.3
            'previous_visits_uz' => ['nullable', 'string', 'max:1000'],  // 6.4

            // 8 (viza taklifnomasi so'ralsa majburiy)
            'passport_number'      => [...$visa, 'nullable', 'string', 'max:50',
                Rule::unique('participants', 'passport_number')->ignore($this->route('participant'))], // 8.1
            'passport_issue_date'  => [...$visa, 'nullable', 'date_format:d.m.Y', 'before_or_equal:today'], // 8.2
            'passport_expiry_date' => [...$visa, 'nullable', 'date_format:d.m.Y', 'after:today'],          // 8.3
            'passport_issued_by'   => [...$visa, 'nullable', 'string', 'max:255'],                         // 8.4
            'passport_scan'        => [...$visa, 'nullable', 'file', 'mimes:jpg,jpeg', 'max:5120'],        // 8.6 (faqat *.jpg)
            'face_photo'           => [...$visa, 'nullable', 'file', 'mimes:jpg,jpeg', 'max:5120',
                'dimensions:min_width=900,min_height=1200'],                                               // 8.7

            // 9-10
            'position'           => [$req, 'string', 'max:255'],         // 9
            'org_name'           => [$req, 'string', 'max:255'],         // 10.1
            'org_location'       => [$req, 'string', 'max:255'],         // 10.2
            'org_address'        => [...$visa, 'nullable', 'string', 'max:500'], // 10.3
            'org_contacts'       => [...$visa, 'nullable', 'string', 'max:500'], // 10.4
            'graduation_date'    => ['nullable', 'string', 'max:50'],    // 10.5
            'previous_olympiads' => ['nullable', 'string', 'max:1000'],  // 10.6

            // 11
            'home_location' => [$req, 'string', 'max:255'],              // 11.1
            'home_address'  => [$req, 'string', 'max:500'],              // 11.2
            'home_phone'    => ['nullable', 'string', 'max:100'],        // 11.3
            'mobile_phone'  => [$req, 'string', 'max:100'],              // 11.4
            'email'         => [$req, 'email', 'max:255'],               // 11.5

            // 12
            'official_language' => [$req, Rule::in(Participant::LANGUAGES)], // 12.1
            'native_languages'  => [$req, 'string', 'max:255'],              // 12.2

            // 13
            'diet'          => ['sometimes', Rule::in(Participant::DIETS)],  // 13.1 (bo'sh bo'lsa standard)
            'food_notes'    => ['nullable', 'string', 'max:1000'],           // 13.2
            'medical_notes' => ['nullable', 'string', 'max:1000'],           // 13.3
            'tshirt_size'   => ['nullable', Rule::in(Participant::TSHIRTS)], // 13.4

            // 14
            'emergency_family_name' => [$req, ...$latin],                // 14.1
            'emergency_first_name'  => [$req, ...$latin],                // 14.2
            'emergency_relation'    => [$req, 'string', 'max:100'],      // 14.3
            'emergency_age'         => ['nullable', 'integer', 'between:1,120'], // 14.4
            'emergency_languages'   => ['nullable', 'string', 'max:255'],// 14.5
            'emergency_phones'      => [$req, 'string', 'max:255'],      // 14.6
            'emergency_email'       => ['nullable', 'email', 'max:255'], // 14.7
            'emergency_telegram'    => ['nullable', 'string', 'max:100'],// 14.8
        ];
    }

    public function messages(): array
    {
        return [
            'regex'     => 'Faqat ingliz alifbosining 26 ta harfidan foydalaning (The :attribute must use Latin letters only).',
            'not_regex' => 'Faqat bosh harflarda yozish mumkin emas (The :attribute must not be ALL CAPS).',
        ];
    }

    /** DD.MM.YYYY -> YYYY-MM-DD (bazaga yozish uchun) */
    public function validated($key = null, $default = null)
    {
        $data = parent::validated();

        foreach (self::DATE_FIELDS as $field) {
            if (!empty($data[$field])) {
                $data[$field] = Carbon::createFromFormat('d.m.Y', $data[$field])->format('Y-m-d');
            }
        }

        return $key ? data_get($data, $key, $default) : $data;
    }
}
