-- Enforce one verification badge per user/type pair.
-- Keep the earliest row for each non-null user_id pair before adding the unique index.
delete from si_mvp.h_verification_badges
where id in (
  select id
  from (
    select
      id,
      row_number() over (
        partition by user_id, type
        order by verified_at asc nulls last, id asc
      ) as rn
    from si_mvp.h_verification_badges
    where user_id is not null
  ) ranked
  where rn > 1
);

create unique index if not exists h_verification_badges_user_type_unique
on si_mvp.h_verification_badges (user_id, type)
where user_id is not null;
