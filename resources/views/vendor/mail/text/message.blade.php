@php($o = \App\Support\Olympiad::settings())
<x-mail::layout>
    {{-- Header --}}
    <x-slot:header>
        <x-mail::header :url="config('iao.frontend_url')">
            {{ \App\Support\Olympiad::shortName() }} — {{ $o['name']['en'] }}
        </x-mail::header>
    </x-slot:header>

    {{-- Body --}}
    {{ $slot }}

    {{-- Subcopy --}}
    @isset($subcopy)
        <x-slot:subcopy>
            <x-mail::subcopy>
                {{ $subcopy }}
            </x-mail::subcopy>
        </x-slot:subcopy>
    @endisset

    {{-- Footer --}}
    <x-slot:footer>
        <x-mail::footer>
            {{ $o['name']['en'] }} · {{ $o['city']['en'] }}, {{ $o['country']['en'] }} · {{ config('iao.frontend_url') }}
        </x-mail::footer>
    </x-slot:footer>
</x-mail::layout>
