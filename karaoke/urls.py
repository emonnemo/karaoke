"""karaoke URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/2.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path

from music.api import song_list
from music.api import recognize
from music import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/recognize', recognize.Recognize.as_view(), name='recognize'),
    path('api/songs', song_list.SongView.as_view(), name='get-songs-list'),
    path('home/', views.index, name='home'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

