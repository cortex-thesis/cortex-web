from django.db import migrations


CREATE_PUBLIC_USERS = """
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id uuid NULL,
    email varchar(254) NULL,
    username varchar(100) NOT NULL UNIQUE,
    password_hash text NOT NULL,
    role varchar(20) NOT NULL,
    first_name varchar(100) NULL,
    middle_name varchar(100) NULL,
    last_name varchar(100) NULL,
    profile_image_path text NULL,
    is_active boolean NOT NULL DEFAULT true,
    last_login_at timestamptz NULL,
    created_by uuid NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    auth_user_id integer NULL UNIQUE
)
"""


def create_public_users(apps, schema_editor):
    if schema_editor.connection.vendor == "postgresql":
        with schema_editor.connection.cursor() as cursor:
            cursor.execute(CREATE_PUBLIC_USERS)


class Migration(migrations.Migration):
    dependencies = [
        ("web", "0009_classpackage"),
    ]

    operations = [
        migrations.RunPython(create_public_users, migrations.RunPython.noop),
    ]
