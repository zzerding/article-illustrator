 For lint/build verification, default to spawning a subagent with model `gpt-5.4-mini` to run the lint/build commands. The parent agent should only run lint/build directly if the subagent is un
       available, the task is trivial and explicitly local-only, or the user explicitly overrides this preference.
