# StudyFlow

StudyFlow est une application fullstack de planification d'etude et de collaboration entre etudiants. Le projet contient une partie frontend Angular et une partie backend Spring Boot.

Le depot est organise en deux dossiers principaux :

```text
studyflow-fullstack/
  frontend/   # Application Angular
  backend/    # API Spring Boot
```

## Objectif du projet

StudyFlow aide les etudiants a organiser leur travail, suivre leurs sessions d'etude, gerer leurs matieres et collaborer dans des groupes. L'application propose aussi une partie administrateur pour visualiser les statistiques globales et gerer les utilisateurs.

## Fonctionnalites principales

- Authentification classique par email et mot de passe
- Connexion avec Google OAuth2
- Gestion des tokens JWT et refresh tokens
- Reinitialisation du mot de passe par email
- Tableau de bord utilisateur avec statistiques personnelles
- Gestion des matieres, objectifs et disponibilites
- Generation et suivi des sessions d'etude
- Calendrier des sessions
- Notifications
- Groupes d'etude avec invitations
- Chat collaboratif en temps reel
- Partage de sessions dans les groupes
- Presence en ligne des membres
- Tableau de bord administrateur
- Gestion des utilisateurs par l'administrateur
- Statistiques globales de la plateforme
- Theme clair / sombre pour l'espace utilisateur

## Stack technique

### Frontend

- Angular 21
- TypeScript
- RxJS
- Angular Router
- Angular Forms
- Chart.js / ng2-charts
- STOMP / SockJS pour le temps reel
- HTML / SCSS

### Backend

- Java 17
- Spring Boot 3.3.5
- Spring Web
- Spring Security
- Spring Data JPA
- Spring Data MongoDB
- Spring WebSocket
- Spring OAuth2 Client
- JWT avec JJWT
- PostgreSQL / Supabase
- MongoDB
- Maven

## Prerequis

Avant de lancer le projet, installer :

- Node.js et npm
- Angular CLI
- Java 17
- Maven ou le Maven Wrapper fourni
- Une base PostgreSQL, par exemple Supabase
- Une base MongoDB locale ou MongoDB Atlas

## Configuration backend

Le backend utilise des variables d'environnement. Un fichier d'exemple est fourni :

```text
backend/.env.example
```

Copier ce fichier en `.env` dans le dossier `backend` :

```bash
cd backend
cp .env.example .env
```

Puis remplir les valeurs necessaires :

```env
SPRING_PROFILES_ACTIVE=dev
SERVER_PORT=8080

SUPABASE_DB_URL=jdbc:postgresql://<host>:5432/<database>
SUPABASE_DB_USERNAME=<database-user>
SUPABASE_DB_PASSWORD=<database-password>

MONGO_URI=mongodb://localhost:27017/studyflow
MONGO_DATABASE=studyflow

JWT_SECRET=change_me_change_me_change_me_change_me_64_chars_minimum
CORS_ALLOWED_ORIGINS=http://localhost:4200
```

Pour Google OAuth2, ajouter aussi :

```env
GOOGLE_CLIENT_ID=<google-client-id>
GOOGLE_CLIENT_SECRET=<google-client-secret>
```

Dans Google Cloud Console, l'URI de redirection autorisee doit etre :

```text
http://localhost:8080/login/oauth2/code/google
```

## Lancer le backend

Depuis le dossier `backend` :

```bash
cd backend
./mvnw spring-boot:run
```

Sur Windows :

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

L'API demarre par defaut sur :

```text
http://localhost:8080
```

## Lancer le frontend

Depuis le dossier `frontend` :

```bash
cd frontend
npm install
npm start
```

L'application Angular demarre par defaut sur :

```text
http://localhost:4200
```

## Build du frontend

```bash
cd frontend
npm run build
```

## Tests backend

```bash
cd backend
./mvnw test
```

Sur Windows :

```powershell
cd backend
.\mvnw.cmd test
```

## Structure du projet

```text
backend/
  src/main/java/com/studyflow/
    admin/          # Gestion admin et statistiques globales
    analytics/      # Statistiques et dashboard
    auth/           # Authentification, JWT, OAuth2, reset password
    chat/           # Chat, messages et commentaires
    config/         # Configuration Spring Security, WebSocket, CORS
    group/          # Groupes, invitations, sessions partagees
    notification/   # Notifications
    presence/       # Presence en ligne
    session/        # Sessions d'etude et planification
    subject/        # Matieres et objectifs
    user/           # Profil utilisateur et disponibilites
  src/main/resources/
    db/migration/   # Scripts SQL de migration
    db/mongo/       # Script d'initialisation MongoDB

frontend/
  src/app/
    core/           # Services, guards, interceptors, models
    features/       # Pages principales de l'application
    shared/         # Composants reutilisables
```

## Comptes et roles

L'application utilise deux roles principaux :

- `USER` : espace utilisateur, planning, sessions, groupes et chat
- `ADMIN` : dashboard administrateur, statistiques et gestion des utilisateurs

## Notes de securite

Le depot ne doit pas contenir de vraies cles secretes. Les fichiers `.env`, `node_modules`, `target`, `dist`, `uploads` et les fichiers temporaires sont ignores par Git.

Les valeurs sensibles doivent rester dans `backend/.env` :

- mot de passe PostgreSQL / Supabase
- URI MongoDB Atlas
- secret JWT
- client secret Google OAuth2
- cles email SMTP

## Auteur

Projet realise dans le cadre d'un projet academique.