<x-mail::message>
{{-- Greeting --}}
@if (! empty($greeting))
# {{ $greeting }}
@endif

{{-- Intro Lines --}}
@foreach ($introLines as $line)
{{ $line }}

@endforeach

{{-- Action Button --}}
@isset($actionText)
<x-mail::button :url="$actionUrl" color="primary">
{{ $actionText }}
</x-mail::button>
@endisset

{{-- Outro Lines --}}
@foreach ($outroLines as $line)
{{ $line }}

@endforeach

{{-- Salutation: the Organising Committee, one line per language --}}
{!! nl2br(e($salutation ?? \App\Support\TriMail::signature())) !!}

{{-- Subcopy --}}
@isset($actionText)
<x-slot:subcopy>
If the button does not work, copy this link into your browser · Если кнопка не работает, скопируйте ссылку в браузер · Tugma ishlamasa, havolani brauzerga nusxalang:
<span class="break-all">[{{ $displayableActionUrl }}]({{ $actionUrl }})</span>
</x-slot:subcopy>
@endisset
</x-mail::message>
