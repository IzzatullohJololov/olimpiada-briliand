<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ParticipantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $d = fn ($date) => $date?->format('d.m.Y');

        return [
            'id' => $this->id,
            'status' => $this->status,
            'student_group' => $this->student_group,
            'previous_prizewinner' => $this->previous_prizewinner,
            'needs_visa_invitation' => $this->needs_visa_invitation,

            'family_name_en' => $this->family_name_en,
            'first_name_en' => $this->first_name_en,
            'family_name_native' => $this->family_name_native,
            'first_name_native' => $this->first_name_native,
            'birth_date' => $d($this->birth_date),
            'birth_place' => $this->birth_place,
            'sex' => $this->sex,

            'citizenship' => $this->citizenship,
            'other_citizenships' => $this->other_citizenships,
            'ethnicity' => $this->ethnicity,
            'previous_visits_uz' => $this->previous_visits_uz,

            'passport_number' => $this->passport_number,
            'passport_issue_date' => $d($this->passport_issue_date),
            'passport_expiry_date' => $d($this->passport_expiry_date),
            'passport_issued_by' => $this->passport_issued_by,
            'has_passport_scan' => (bool) $this->passport_scan_path,
            'has_face_photo' => (bool) $this->face_photo_path,

            'position' => $this->position,
            'org_name' => $this->org_name,
            'org_location' => $this->org_location,
            'org_address' => $this->org_address,
            'org_contacts' => $this->org_contacts,
            'graduation_date' => $this->graduation_date,
            'previous_olympiads' => $this->previous_olympiads,

            'home_location' => $this->home_location,
            'home_address' => $this->home_address,
            'home_phone' => $this->home_phone,
            'mobile_phone' => $this->mobile_phone,
            'email' => $this->email,

            'official_language' => $this->official_language,
            'native_languages' => $this->native_languages,

            'diet' => $this->diet,
            'food_notes' => $this->food_notes,
            'medical_notes' => $this->medical_notes,
            'tshirt_size' => $this->tshirt_size,

            'emergency_contact' => [
                'family_name' => $this->emergency_family_name,
                'first_name' => $this->emergency_first_name,
                'relation' => $this->emergency_relation,
                'age' => $this->emergency_age,
                'languages' => $this->emergency_languages,
                'phones' => $this->emergency_phones,
                'email' => $this->emergency_email,
                'telegram' => $this->emergency_telegram,
            ],

            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
