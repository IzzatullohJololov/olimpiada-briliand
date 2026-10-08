<?php

namespace App\Support;

use Illuminate\Notifications\Messages\MailMessage;

/**
 * Emails to teams in three languages: English, Русский, Oʻzbekcha.
 * Each language is a section with its own heading; the button and the signature are shared.
 */
final class TriMail
{
    public const LANGS = ['en' => 'English', 'ru' => 'Русский', 'uz' => 'Oʻzbekcha'];

    /** "Dear …," in each language */
    public static function greetings(string $name): array
    {
        return ['en' => "Dear {$name},", 'ru' => "Здравствуйте, {$name}!", 'uz' => "Hurmatli {$name}!"];
    }

    /**
     * @param array $subject  ['en' => …, 'ru' => …, 'uz' => …] — joined into one subject line
     * @param array $sections ['en' => [lines…], 'ru' => [lines…], 'uz' => [lines…]] (Markdown allowed)
     * @param array|null $action ['url' => …, 'text' => ['en' => …, 'ru' => …, 'uz' => …]]
     * @param array $after   lines shown once after the button (e.g. a list of names)
     */
    public static function make(array $subject, array $sections, ?array $action = null, array $after = [], string $suffix = ''): MailMessage
    {
        $mail = (new MailMessage)
            ->subject(Olympiad::shortName() . ': ' . implode(' / ', [$subject['en'], $subject['ru'], $subject['uz']]) . ($suffix !== '' ? " — {$suffix}" : ''))
            ->greeting(implode(' · ', [$subject['en'], $subject['ru'], $subject['uz']]));

        $first = true;
        foreach (self::LANGS as $code => $label) {
            if (!$first) $mail->line('———');
            $mail->line("**{$label}**");
            foreach ($sections[$code] ?? [] as $line) {
                $mail->line($line);
            }
            $first = false;
        }

        if ($action) {
            $mail->action(implode(' · ', [$action['text']['en'], $action['text']['ru'], $action['text']['uz']]), $action['url']);
        }
        foreach ($after as $line) {
            $mail->line($line);
        }

        return $mail->salutation(self::signature());
    }

    /** Shared signature of the Organising Committee (one line per language). */
    public static function signature(): string
    {
        $short = Olympiad::shortName();

        return "Organising Committee of {$short}\nОргкомитет {$short}\n{$short} tashkiliy qoʻmitasi";
    }

    public static function signIn(): array
    {
        return [
            'url' => config('iao.frontend_url') . '/login',
            'text' => ['en' => 'Sign in', 'ru' => 'Войти', 'uz' => 'Kirish'],
        ];
    }
}
