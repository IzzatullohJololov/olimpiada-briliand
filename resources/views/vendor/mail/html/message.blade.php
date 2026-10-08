@php($o = \App\Support\Olympiad::settings())
<x-mail::layout>
{{-- Header: olympiad name instead of the Laravel logo --}}
<x-slot:header>
<x-mail::header :url="config('iao.frontend_url')">
<span style="display:block;font-size:20px;letter-spacing:.02em;color:#13284A;">{{ \App\Support\Olympiad::shortName() }}</span>
<span style="display:block;font-size:13px;font-weight:normal;color:#687891;margin-top:4px;">{{ $o['name']['en'] }}</span>
</x-mail::header>
</x-slot:header>

{{-- Body --}}
{!! $slot !!}

{{-- Subcopy --}}
@isset($subcopy)
<x-slot:subcopy>
<x-mail::subcopy>
{!! $subcopy !!}
</x-mail::subcopy>
</x-slot:subcopy>
@endisset

{{-- Footer --}}
<x-slot:footer>
<x-mail::footer>
{{ $o['name']['en'] }} · {{ $o['city']['en'] }}, {{ $o['country']['en'] }}<br>
Euro-Asian Astronomical Society · [{{ parse_url(config('iao.frontend_url'), PHP_URL_HOST) }}]({{ config('iao.frontend_url') }})
</x-mail::footer>
</x-slot:footer>
</x-mail::layout>
