<?php

namespace App\Notifications;

use App\Models\Team;
use App\Support\TriMail;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * To the responsible person: the application was not approved.
 * Standard reasons appear in each language; the organisers' comment is shown in the
 * language it was written in, or — if that language is empty — in another language with a note.
 */
class TeamRejected extends Notification
{
    private const LABELS = [
        'reasons' => ['en' => 'Reason:', 'ru' => 'Причина:', 'uz' => 'Sabab:'],
        'comment' => ['en' => 'Comment of the Organising Committee:', 'ru' => 'Комментарий оргкомитета:', 'uz' => 'Tashkiliy qoʻmita izohi:'],
        // "(original in …)" — key: section language, then the language of the original comment
        'original' => [
            'en' => ['ru' => '(original in Russian)', 'uz' => '(original in Uzbek)', 'en' => ''],
            'ru' => ['en' => '(оригинал на английском)', 'uz' => '(оригинал на узбекском)', 'ru' => ''],
            'uz' => ['en' => '(asl matn ingliz tilida)', 'ru' => '(asl matn rus tilida)', 'uz' => ''],
        ],
    ];

    public function __construct(private Team $team) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $c = $this->team->country;
        $hi = TriMail::greetings($notifiable->name);
        $details = $this->team->rejection ?? [];
        $reasons = array_values(array_filter($details['reasons'] ?? [], fn ($r) => isset(Team::REJECTION_REASONS[$r])));
        $comment = array_filter((array) ($details['comment'] ?? []), fn ($v) => trim((string) $v) !== '');

        // Applications rejected before reasons existed: keep the old free-text reason.
        if (!$reasons && !$comment && trim((string) $this->team->rejection_reason) !== '') {
            $comment = ['uz' => trim($this->team->rejection_reason)];
        }

        $why = function (string $lang) use ($reasons, $comment) {
            $lines = [];
            if ($reasons) {
                $lines[] = '**' . self::LABELS['reasons'][$lang] . '**';
                foreach ($reasons as $r) {
                    $lines[] = '• ' . Team::REJECTION_REASONS[$r][$lang];
                }
            }
            if ($comment) {
                $src = isset($comment[$lang]) ? $lang : array_key_first($comment);
                $note = self::LABELS['original'][$lang][$src];
                $lines[] = '**' . self::LABELS['comment'][$lang] . '** ' . $comment[$src] . ($note !== '' ? " {$note}" : '');
            }

            return $lines;
        };

        return TriMail::make(
            ['en' => 'Application not approved', 'ru' => 'Заявка не подтверждена', 'uz' => 'Ariza tasdiqlanmadi'],
            [
                'en' => [$hi['en'], "The Organising Committee could not approve the application of the team of {$c}.", ...$why('en'),
                    'If you have questions, please contact the Organising Committee.'],
                'ru' => [$hi['ru'], "Оргкомитет не смог подтвердить заявку команды «{$c}».", ...$why('ru'),
                    'Если у вас есть вопросы, свяжитесь с оргкомитетом.'],
                'uz' => [$hi['uz'], "Tashkiliy qoʻmita {$c} jamoasining arizasini tasdiqlay olmadi.", ...$why('uz'),
                    'Savollaringiz boʻlsa, tashkiliy qoʻmita bilan bogʻlaning.'],
            ],
            suffix: $c,
        );
    }
}
