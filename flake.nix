{
  inputs = {
    flake-parts = {
      inputs.nixpkgs-lib.follows = "nixpkgs";
      url = "github:hercules-ci/flake-parts";
    };

    process-compose-flake.url = "github:Platonic-Systems/process-compose-flake";
    services-flake.url = "github:juspay/services-flake";

    devshell = {
      inputs.nixpkgs.follows = "nixpkgs";
      url = "github:numtide/devshell";
    };

    # dream2nix_legacy = {
    #   url = "github:nix-community/dream2nix/c9c8689f09aa95212e75f3108788862583a1cf5a";
    #   inputs.nixpkgs.follows = "nixpkgs";
    # };

    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
  };

  outputs = { flake-parts, devshell, process-compose-flake, ... }@inputs:
  flake-parts.lib.mkFlake { inherit inputs; }(
    { lib, ... }: {
      systems = [ "x86_64-linux" ];
      imports = [ 
        devshell.flakeModule
        process-compose-flake.flakeModule
      ];
      perSystem = { pkgs, ... }: let
        installer = pkgs.buildNpmPackage {
            name = "documenso";
            src = ./.;
            npmDepsHash = "sha256-zyAMbBapdwNjDDDp/DEplkDla82X3U/PC2xLVmO/yXo=";
            makeCacheWritable = true;
            dontNpmInstall = true;
            dontNpmBuild = true;
            npmFlags = [
              "--loglevel=verbose"
              "--legacy-peer-deps"
              "--ignore-scripts"
            ];
            buildInputs = [
              pkgs.vips
              pkgs.sqlite

              pkgs.breakpointHook
              pkgs.toybox
              # pkgs.node-gyp
              # pkgs.node-pre-gyp
            ];
            nativeBuildInputs = [
              pkgs.pkg-config
              pkgs.playwright-driver.browsers
              pkgs.node-pre-gyp
              pkgs.tree
              pkgs.prisma-engines
              pkgs.cacert
              pkgs.vim
            ];
            patches = [
              ./fonts.patch
            ];

            postPatch = let
              gfonts = pkgs.google-fonts.override { fonts = [
                "Inter" "Caveat"
              ]; };
            in ''
              cp "${gfonts}/share/fonts/truetype/Inter[opsz,wght].ttf" apps/web/src/app/Inter.ttf
              cp "${gfonts}/share/fonts/truetype/Caveat[wght].ttf" apps/web/src/app/Caveat.ttf
              cp "${gfonts}/share/fonts/truetype/Caveat[wght].ttf" packages/ui/primitives/Caveat.ttf
            '';
            buildPhase = let

            in ''
              export NODE_PATH=$NODE_PATH:$out/node_modules

              export PATH=$PATH:$out/node_modules/.bin:$out/packages/prisma/node_modules/.bin
              
              mkdir -p out
              mkdir -p $out/node_modules
              ./node_modules/.bin/turbo prune --scope=@documenso/web --docker --out-dir out
              cp -r node_modules $out/
              cp -a out/json/. $out
              cp ./package-lock.json $out
              cp lingui.config.ts $out

              cp -a out/full/. $out

              cp turbo.json $out

              cd $out

              substituteInPlace $out/packages/prisma/node_modules/.bin/prisma-json-types-generator \
                $out/packages/prisma/node_modules/.bin/zod-prisma-types \
                --replace-warn "#!/usr/bin/env node" "#!${lib.getExe pkgs.nodejs}"

              ./node_modules/.bin/turbo run build --filter=@documenso/web...
            '';
            # substituteInPlace $out/turbo.json --replace-quiet "pipeline" "tasks"

            installPhase = ''
            '';
            env = {
              HUSKY = 0;
              TURBO_TELEMETRY_DISABLED = 1;
              TURBO_NO_UPDATE_NOTIFIER = 1;
              DO_NOT_TRACK = 1;
              TURBO_API = "localhost";
              DATABASE_URL = "file:./tmp.db";

              NEXT_TELEMETRY_DISABLED = 1;
              NEXT_PRIVATE_ENCRYPTION_KEY="CAFEBABE";
              NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY="DEADBEEF";
              PRISMA_QUERY_ENGINE_BINARY = "${pkgs.prisma-engines}/bin/query-engine";
              PRISMA_QUERY_ENGINE_LIBRARY = "${pkgs.prisma-engines}/lib/libquery_engine.node";
              PRISMA_SCHEMA_ENGINE_BINARY = "${pkgs.prisma-engines}/bin/schema-engine";
              PLAYWRIGHT_BROWSERS_PATH = "${pkgs.playwright-driver.browsers}";
              PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = true;
            };
          };

      in {

        process-compose."tmp-db" = { ... }: {
          imports = [
            inputs.services-flake.processComposeModules.default
          ];
          services.postgres."psql1" = {
            enable = true;
          };
        };

        packages = {

          default = installer;

          devshells.default = {
            env = [

            ];

            packages = with pkgs; [
              nodejs
              turbo
            ];
          };
        };
      };
    }
  );
}