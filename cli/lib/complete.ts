export function generateCompletions(shell: string): string {
    switch (shell) {
        case 'bash':
            return `#!/bin/bash
_kitchen_completions() {
    local cur prev
    COMPREPLY=()
    cur="\${COMP_WORDS[COMP_CWORD]}"
    prev="\${COMP_WORDS[COMP_CWORD-1]}"

    case "\${COMP_CWORD}" in
        1)
            COMPREPLY=(\$(compgen -W "acl recipe job completion" -- \${cur}))
            ;;
        2)
            case "\${prev}" in
                acl)
                    COMPREPLY=()
                    ;;
                recipe)
                    COMPREPLY=()
                    ;;
                job)
                    COMPREPLY=(\$(compgen -W "opensearch scheduled" -- \${cur}))
                    ;;
            esac
            ;;
        3)
            case "\${COMP_WORDS[1]}" in
                job)
                    case "\${COMP_WORDS[2]}" in
                        opensearch)
                            COMPREPLY=(\$(compgen -W "sync-recipes sync-recipe sync-ingredients sync-tags" -- \${cur}))
                            ;;
                        scheduled)
                            COMPREPLY=(\$(compgen -W "trending-recipes sync-contacts-notifuse backup-database-hourly backup-database-daily purge-thumbnail-cache generate-og-images" -- \${cur}))
                            ;;
                    esac
                    ;;
            esac
            ;;
    esac
    return 0
}
complete -F _kitchen_completions kitchen`;

        case 'zsh':
            return `# KitchenPace CLI zsh completion
autoload -U compinit
compinit

_kitchen() {
    local -a commands
    commands=(
        'acl:User access control management'
        'recipe:Recipe management'
        'job:Dispatch BullMQ jobs'
        'completion:Generate shell completion'
    )

    local -a queue_opts
    queue_opts=(
        'opensearch:OpenSearch queue'
        'scheduled:Scheduled jobs queue'
    )

    local -a opensearch_jobs
    opensearch_jobs=(
        'sync-recipes:Sync all recipes'
        'sync-recipe:Sync single recipe'
        'sync-ingredients:Sync ingredients'
        'sync-tags:Sync tags'
    )

    local -a scheduled_jobs
    scheduled_jobs=(
        'trending-recipes:Calculate trending'
        'sync-contacts-notifuse:Sync contacts'
        'backup-database-hourly:Hourly backup'
        'backup-database-daily:Daily backup'
        'purge-thumbnail-cache:Purge thumb cache'
        'generate-og-images:Generate OG images'
    )

    case "\${words[1]}" in
        acl)
            _message 'email address'
            ;;
        recipe)
            _message 'recipe id, slug, or title'
            ;;
        job)
            case "\${words[2]}" in
                opensearch)
                    _describe 'job' opensearch_jobs
                    ;;
                scheduled)
                    _describe 'job' scheduled_jobs
                    ;;
                *)
                    _describe 'queue' queue_opts
                    ;;
            esac
            ;;
        *)
            _describe 'command' commands
            ;;
    esac
}

compdef _kitchen kitchen`;

        case 'fish':
            return `# KitchenPace CLI fish completion
complete -c kitchen -f

# Main commands
complete -c kitchen -n '__fish_use_subcommand' -a 'acl' -d 'User access control'
complete -c kitchen -n '__fish_use_subcommand' -a 'recipe' -d 'Recipe management'
complete -c kitchen -n '__fish_use_subcommand' -a 'job' -d 'Dispatch BullMQ jobs'
complete -c kitchen -n '__fish_use_subcommand' -a 'completion' -d 'Generate shell completion'

# acl subcommand
complete -c kitchen -n '__fish_seen_subcommand_from acl' -l role -r -d 'Set role (USER, ADMIN)'
complete -c kitchen -n '__fish_seen_subcommand_from acl' -l activate -d 'Activate user'
complete -c kitchen -n '__fish_seen_subcommand_from acl' -l deactivate -d 'Deactivate user'
complete -c kitchen -n '__fish_seen_subcommand_from acl' -l info -d 'Show user info'

# recipe subcommand
complete -c kitchen -n '__fish_seen_subcommand_from recipe' -l publish -d 'Publish recipe'
complete -c kitchen -n '__fish_seen_subcommand_from recipe' -l unpublish -d 'Set to draft'
complete -c kitchen -n '__fish_seen_subcommand_from recipe' -l archive -d 'Archive recipe'
complete -c kitchen -n '__fish_seen_subcommand_from recipe' -l status -r -d 'Set status'
complete -c kitchen -n '__fish_seen_subcommand_from recipe' -l info -d 'Show recipe info'

# job subcommand
complete -c kitchen -n '__fish_seen_subcommand_from job' -a 'opensearch' -d 'OpenSearch queue'
complete -c kitchen -n '__fish_seen_subcommand_from job' -a 'scheduled' -d 'Scheduled queue'
complete -c kitchen -n '__fish_seen_subcommand_from job' -l list -d 'List available jobs'

# job -> opensearch
complete -c kitchen -n '__fish_seen_subcommand_from job; and __fish_seen_subcommand_from opensearch' -a 'sync-recipes' -d 'Sync all recipes'
complete -c kitchen -n '__fish_seen_subcommand_from job; and __fish_seen_subcommand_from opensearch' -a 'sync-recipe' -d 'Sync single recipe'
complete -c kitchen -n '__fish_seen_subcommand_from job; and __fish_seen_subcommand_from opensearch' -a 'sync-ingredients' -d 'Sync ingredients'
complete -c kitchen -n '__fish_seen_subcommand_from job; and __fish_seen_subcommand_from opensearch' -a 'sync-tags' -d 'Sync tags'

# job -> scheduled
complete -c kitchen -n '__fish_seen_subcommand_from job; and __fish_seen_subcommand_from scheduled' -a 'trending-recipes' -d 'Trending recipes'
complete -c kitchen -n '__fish_seen_subcommand_from job; and __fish_seen_subcommand_from scheduled' -a 'sync-contacts-notifuse' -d 'Sync contacts'
complete -c kitchen -n '__fish_seen_subcommand_from job; and __fish_seen_subcommand_from scheduled' -a 'backup-database-hourly' -d 'Hourly backup'
complete -c kitchen -n '__fish_seen_subcommand_from job; and __fish_seen_subcommand_from scheduled' -a 'backup-database-daily' -d 'Daily backup'
complete -c kitchen -n '__fish_seen_subcommand_from job; and __fish_seen_subcommand_from scheduled' -a 'purge-thumbnail-cache' -d 'Purge thumb cache'
complete -c kitchen -n '__fish_seen_subcommand_from job; and __fish_seen_subcommand_from scheduled' -a 'generate-og-images' -d 'Generate OG images'`;

        default:
            console.error('Unsupported shell. Use: bash, zsh, or fish');
            process.exit(1);
    }
}
