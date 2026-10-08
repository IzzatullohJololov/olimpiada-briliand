<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ParticipantRequest;
use App\Http\Resources\ParticipantResource;
use App\Models\Participant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ParticipantController extends Controller
{
    /** Faqat o'z jamoasi ishtirokchilari (boshqa jamoaniki -> 404) */
    private function find(Request $request, string $id): Participant
    {
        return $request->user()->team->participants()->findOrFail($id);
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = $request->user()->team->participants()->orderBy('id');

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }
        // ?paid=1 — to'lov qilganlar, ?paid=0 — qilmaganlar
        if ($request->filled('paid')) {
            $query->where('is_paid', $request->boolean('paid'));
        }

        return ParticipantResource::collection($query->get());
    }

    public function store(ParticipantRequest $request): JsonResponse
    {
        $data = Arr::except($request->validated(), ['passport_scan', 'face_photo']);

        $participant = $request->user()->team->participants()->create($data);
        $this->saveFiles($request, $participant);

        return (new ParticipantResource($participant->refresh()))->response()->setStatusCode(201);
    }

    public function show(Request $request, string $participant): ParticipantResource
    {
        return new ParticipantResource($this->find($request, $participant));
    }

    public function update(ParticipantRequest $request, string $participant): ParticipantResource
    {
        $model = $this->find($request, $participant);
        $model->update(Arr::except($request->validated(), ['passport_scan', 'face_photo']));
        $this->saveFiles($request, $model);

        return new ParticipantResource($model->refresh());
    }

    public function destroy(Request $request, string $participant): JsonResponse
    {
        $model = $this->find($request, $participant);
        Storage::disk('local')->deleteDirectory($this->dir($model));
        $model->delete();

        return response()->json(null, 204);
    }

    /** Pasport skani yoki yuz suratini yuklab olish: /participants/{id}/files/passport|face */
    public function file(Request $request, string $participant, string $type): StreamedResponse
    {
        $model = $this->find($request, $participant);
        $path = $type === 'passport' ? $model->passport_scan_path : $model->face_photo_path;

        abort_if(!$path || !Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->download($path);
    }

    private function dir(Participant $p): string
    {
        return "participants/{$p->team_id}/{$p->id}";
    }

    /** Fayl nomlari tashkilotchilar talabi bo'yicha: Pas-Familiya.jpg, Face-Familiya.jpg */
    private function saveFiles(ParticipantRequest $request, Participant $p): void
    {
        $surname = Str::slug($p->family_name_en, '');

        if ($request->hasFile('passport_scan')) {
            $p->passport_scan_path = $request->file('passport_scan')->storeAs($this->dir($p), "Pas-{$surname}.jpg", 'local');
        }
        if ($request->hasFile('face_photo')) {
            $p->face_photo_path = $request->file('face_photo')->storeAs($this->dir($p), "Face-{$surname}.jpg", 'local');
        }

        $p->save();
    }
}
