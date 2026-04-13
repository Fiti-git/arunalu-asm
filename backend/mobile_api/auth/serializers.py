from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class MobileTokenObtainPairSerializer(TokenObtainPairSerializer):

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        token['username'] = user.username
        token['email'] = user.email
        token['is_staff'] = user.is_staff
        token['is_superuser'] = user.is_superuser

        group = user.groups.first()
        token['role'] = group.name if group else None

        return token
